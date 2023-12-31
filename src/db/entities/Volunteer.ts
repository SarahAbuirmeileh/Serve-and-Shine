import { BaseEntity, BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import bcrypt from 'bcrypt';
import { Role } from "./Role.js";
import { VolunteerProfile } from "./VolunteerProfile.js";
import { NSVolunteer } from "../../../types/volunteer.js";

@Entity()
export class Volunteer extends BaseEntity implements NSVolunteer.IVolunteer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255, nullable: false })
    name: string;

    @Column({ nullable: false, unique:true })
    email: string;

    @BeforeInsert()
    async hashPassword() {
        if (this.password) {
            this.password = await bcrypt.hash(this.password, 10)
        }
    }
    @Column({ nullable: false })
    password: string;

    @Column({
        type: 'enum',
        enum: ['volunteer', 'premium'],
        default: 'volunteer',
        nullable: true
    })
    type: 'volunteer' | 'premium';

    @ManyToMany(() => Role)
    @JoinTable()
    roles: Role[];

    @OneToOne(() => VolunteerProfile, { cascade: true, onDelete: "SET NULL" })
    @JoinColumn()
    volunteerProfile: VolunteerProfile

    @CreateDateColumn({
        type: 'timestamp',
        default: () => "CURRENT_TIMESTAMP(6)"
    })
    createdAt: Date;
}